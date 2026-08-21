import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export function AuctionJoinQr({ auctionId }: { auctionId: string }) {
  const [expanded, setExpanded] = useState(false)
  const joinUrl = `${window.location.origin}/viewer/${auctionId}`

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="glass-card fixed bottom-24 right-4 z-40 flex flex-col items-center gap-1 p-2 shadow-lg"
        title="Scan to join this auction"
      >
        <span className="relative z-[3] rounded bg-white p-1">
          <QRCodeSVG value={joinUrl} size={56} />
        </span>
        <span className="relative z-[3] text-[10px] font-medium text-gray-600 dark:text-gray-400">
          Scan to join
        </span>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-xl bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeSVG value={joinUrl} size={Math.min(window.innerWidth, window.innerHeight) * 0.6} />
            <p className="text-center text-sm text-gray-600">Scan with your phone's camera to join</p>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm font-medium text-orange-600 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
