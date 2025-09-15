export function Card({content}: {content:string}) {
    return (
      <div
      >
        <div
          className="relative w-full h-full transition-transform preserve-3d"
        >
          {/* Back (face down) */}
          <div className="absolute w-full h-full bg-gray-800 rounded-xl flex items-center justify-center backface-hidden shadow-md">
            {content}
          </div>
  
        </div>
      </div>
    );
  }