import React, { useState, useEffect, useRef } from 'react';
import { haversineDistance, bearing, formatDistance } from '../utils/geo';

/**
 * Brújula GPS que apunta al destino.
 * Props:
 *   targetLat, targetLng  — coordenadas del destino (ocultas al usuario)
 *   radius                — metros para considerarse "llegado"
 *   onArrive              — callback cuando entra en radio
 */
export default function GpsCompass({ targetLat, targetLng, radius = 15, onArrive }) {
  const [position, setPosition]         = useState(null);   // { lat, lng }
  const [heading, setHeading]           = useState(null);   // grados desde el Norte (dispositivo)
  const [distance, setDistance]         = useState(null);   // metros
  const [targetBearing, setTargetBearing] = useState(null); // grados hacia el destino
  const [gpsError, setGpsError]         = useState('');
  const [compassError, setCompassError] = useState('');
  const [permissionAsked, setPermissionAsked] = useState(false);

  const watchRef = useRef(null);
  const withinRef = useRef(false);

  // ── GPS ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Tu dispositivo no tiene GPS.');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPosition({ lat, lng });
        setGpsError('');

        const dist = haversineDistance(lat, lng, targetLat, targetLng);
        const bear = bearing(lat, lng, targetLat, targetLng);
        setDistance(dist);
        setTargetBearing(bear);

        if (dist <= radius && !withinRef.current) {
          withinRef.current = true;
          onArrive?.({ lat, lng, distance: dist });
        }
      },
      (err) => {
        if (err.code === 1) setGpsError('Permiso de ubicación denegado. Actívalo en ajustes.');
        else setGpsError('No se puede obtener tu ubicación.');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [targetLat, targetLng, radius]);

  // ── Brújula ───────────────────────────────────────────────────────────────
  async function requestCompass() {
    setPermissionAsked(true);
    // iOS 13+ requiere permiso explícito
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') {
          setCompassError('Permiso de brújula denegado.');
          return;
        }
      } catch {
        setCompassError('No se pudo activar la brújula.');
        return;
      }
    }
    startListening();
  }

  function startListening() {
    const handler = (e) => {
      // iOS: webkitCompassHeading (grados desde el Norte, clockwise)
      // Android: alpha (grados anticlockwise desde Norte magnético)
      if (e.webkitCompassHeading != null) {
        setHeading(e.webkitCompassHeading);
      } else if (e.absolute && e.alpha != null) {
        setHeading((360 - e.alpha) % 360);
      } else if (e.alpha != null) {
        setHeading((360 - e.alpha) % 360);
      }
    };
    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
    // No cleanup intencional en este helper — el componente se desmontará
  }

  // ── Ángulo de la flecha ───────────────────────────────────────────────────
  // arrowAngle = rumbo hacia el destino − orientación actual del dispositivo
  const arrowAngle =
    heading != null && targetBearing != null
      ? ((targetBearing - heading + 360) % 360)
      : targetBearing ?? 0;

  const withinRadius = distance != null && distance <= radius;

  return (
    <div className="space-y-4">
      {/* Distancia */}
      <div className="text-center">
        {distance != null ? (
          <div className={`inline-block px-6 py-3 rounded-2xl font-bold text-3xl
            ${withinRadius
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-amber-100 text-amber-800 border-2 border-amber-300'
            }`}>
            {withinRadius ? '📍 ¡Estás aquí!' : `📏 ${formatDistance(distance)}`}
          </div>
        ) : (
          <div className="inline-block px-6 py-3 rounded-2xl bg-gray-100 text-gray-500 text-lg">
            {gpsError || 'Buscando señal GPS…'}
          </div>
        )}
      </div>

      {/* Brújula */}
      <div className="flex flex-col items-center gap-3">
        {!permissionAsked && typeof DeviceOrientationEvent?.requestPermission === 'function' ? (
          <button
            onClick={requestCompass}
            className="btn-secondary text-sm"
          >
            🧭 Activar brújula
          </button>
        ) : null}

        {compassError && (
          <p className="text-xs text-red-500 text-center">{compassError}</p>
        )}

        {/* Círculo brújula */}
        <div className="relative w-52 h-52">
          {/* Fondo */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-xl" />

          {/* Rosa de los vientos — puntos cardinales fijos */}
          {['N','E','S','O'].map((dir, i) => {
            const angle = i * 90;
            const rad = (angle - 90) * (Math.PI / 180);
            const r = 88;
            const x = 104 + r * Math.cos(rad);
            const y = 104 + r * Math.sin(rad);
            return (
              <span
                key={dir}
                className="absolute text-xs font-bold text-slate-400 select-none"
                style={{ left: x - 5, top: y - 7 }}
              >
                {dir}
              </span>
            );
          })}

          {/* Marcas de los 8 vientos */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = i * 45;
            const rad = (angle - 90) * (Math.PI / 180);
            const r1 = 72, r2 = 80;
            const x1 = 104 + r1 * Math.cos(rad);
            const y1 = 104 + r1 * Math.sin(rad);
            const x2 = 104 + r2 * Math.cos(rad);
            const y2 = 104 + r2 * Math.sin(rad);
            return (
              <svg key={i} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="1.5" />
              </svg>
            );
          })}

          {/* Flecha apuntando al destino */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${arrowAngle}deg)` }}
          >
            <svg viewBox="0 0 40 80" className="w-10 h-20" fill="none">
              {/* Mitad superior — punta roja */}
              <polygon points="20,2 32,40 20,33 8,40" fill="#ef4444" />
              {/* Mitad inferior — blanca */}
              <polygon points="20,78 32,40 20,47 8,40" fill="white" opacity="0.85" />
            </svg>
          </div>

          {/* Punto central */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white shadow-md z-10" />
          </div>
        </div>

        {heading == null && !compassError && permissionAsked && (
          <p className="text-xs text-gray-400">Buscando orientación del dispositivo…</p>
        )}
        {heading == null && !permissionAsked && typeof DeviceOrientationEvent?.requestPermission !== 'function' && (
          <p className="text-xs text-gray-400">La flecha apunta al destino ↑ (sin giroscopio activo)</p>
        )}
      </div>

      {gpsError && (
        <p className="text-xs text-red-500 text-center">{gpsError}</p>
      )}
    </div>
  );
}
