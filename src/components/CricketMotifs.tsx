export function CricketMotifs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <img
        src="/motifs/stadium.jpg"
        alt=""
        className="absolute bottom-0 left-0 h-56 w-full object-cover object-bottom opacity-60 sm:h-96"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 35%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 35%)',
        }}
      />
      <img
        src="/motifs/ball-red.png"
        alt=""
        className="absolute left-6 top-20 h-12 w-12 opacity-40 sm:h-14 sm:w-14"
      />
      <img
        src="/motifs/ball-white.png"
        alt=""
        className="absolute bottom-24 left-10 h-10 w-10 opacity-30 sm:h-12 sm:w-12"
      />
      <img
        src="/motifs/bat.png"
        alt=""
        className="absolute bottom-6 right-6 h-28 w-28 opacity-45 sm:h-36 sm:w-36"
      />
    </div>
  )
}
