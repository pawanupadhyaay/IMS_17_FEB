/**
 * Rado-style luxury analog clock. Fluted gold bezel, hour markers, numbers 1–12, gold hands.
 * Receives time from parent; -90deg offset so 12 o'clock is at top.
 */
const SIZE = 84
const OFFSET = -90
const CENTER = SIZE / 2
const BEZEL = 6
const FACE_R = (SIZE - BEZEL * 2) / 2

function handStyle(clockDeg) {
  return { transform: `rotate(${clockDeg + OFFSET}deg)` }
}

// angleDeg: 0 = 12 o'clock (top), 30 = 1 o'clock, etc. Screen Y increases downward so use -90.
function numberPos(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const r = FACE_R * 0.68
  const x = CENTER + r * Math.cos(rad)
  const y = CENTER + r * Math.sin(rad)
  return { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export default function AnalogClock({ time }) {
  const hours = time.getHours() % 12
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  const secondDeg = (seconds / 60) * 360
  const minuteDeg = (minutes / 60) * 360 + (seconds / 60) * 6
  const hourDeg = (hours / 12) * 360 + (minutes / 60) * 30

  // The distance from center to the marker edge
  const MARKER_RADIUS = (SIZE / 2) - 4;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#C6A74E]/20"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`Analog clock: ${time.toLocaleTimeString()}`}
    >
      {/* Premium Fluted Bezel Ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, #C6A74E, #E2D1A1, #C6A74E, #B8963F, #C6A74E)`,
          padding: '2px' 
        }}
      >
        <div className="h-full w-full rounded-full bg-white relative overflow-hidden">
           {/* Subtle Sunburst Background */}
           <div className="absolute inset-0 opacity-[0.03]" 
                style={{ background: 'conic-gradient(from 0deg, #000, transparent, #000, transparent, #000)' }} />
           
           {/* Precision Markers System (12, 3, 6, 9 Bars; others Dots) */}
           {[...Array(12)].map((_, i) => {
             const angle = i * 30;
             const isMain = angle % 90 === 0;
             
             return (
               <div
                 key={angle}
                 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                 style={{ 
                   transform: `rotate(${angle}deg) translateY(-${MARKER_RADIUS - (isMain ? 2 : 3)}px)` 
                 }}
               >
                 {isMain ? (
                   <div className="h-2.5 w-[1px] bg-[#C6A74E]" />
                 ) : (
                   <div className="size-[1.5px] rounded-full bg-[#C6A74E]/90" />
                 )}
               </div>
             );
           })}

           {/* Brand Logo - Top Placement (12 O'Clock) */}
           <div 
             className="absolute left-1/2 -translate-x-1/2 z-10 opacity-80 pointer-events-none"
             style={{ top: '18%' }}
           >
             <img 
               src="https://res.cloudinary.com/dnrbahpzc/image/upload/v1777546626/samay-logo-removebg-preview_u9zwef.png" 
               alt="" 
               className="w-8 h-auto brightness-50"
             />
           </div>

           {/* Hour Hand - Slim Tapered Stick */}
           <div
             className="absolute left-1/2 top-1/2 z-20 h-[1.5px] w-[20%] origin-left -translate-y-1/2 rounded-full bg-neutral-900 shadow-sm"
             style={handStyle(hourDeg)}
           />
           
           {/* Minute Hand - Longer Slim Needle */}
           <div
             className="absolute left-1/2 top-1/2 z-20 h-[0.8px] w-[30%] origin-left -translate-y-1/2 bg-neutral-600"
             style={handStyle(minuteDeg)}
           />

           {/* Second Hand - Gold Thread */}
           <div
             className="absolute left-1/2 top-1/2 z-30 h-[0.6px] w-[35%] origin-left -translate-y-1/2 bg-[#C6A74E]"
             style={handStyle(secondDeg)}
           />

           {/* Precision Center Pin */}
           <div className="absolute left-1/2 top-1/2 z-40 size-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black border border-[#C6A74E]" />
        </div>
      </div>
    </div>
  )
}
