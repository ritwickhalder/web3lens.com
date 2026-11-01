'use client';

import Image from 'next/image';
import { useState } from 'react';
import { DONATION_ADDRESSES } from '@/config/site';

/** Fixed bottom donation bar that expands to show the addresses (replaces legacy/footer.js). */
export function DonationFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border border-black/[.125] text-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="donation-details"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-donate px-5 py-2.5 text-[1.05rem] text-[#155724] hover:underline"
      >
        Would appreciate any <b className="text-blue-700">donation</b> to keep this website simple and ad-free. Spread
        the crypto-love &#x2665;
      </button>
      {open && (
        <div id="donation-details" className="bg-white px-5 py-4 text-[#212529]">
          {DONATION_ADDRESSES.map((d) => (
            <p key={d.label} className="break-all">
              <b>{d.label} :</b> {d.address}
            </p>
          ))}
          <Image src="/donate.png" alt="donate" width={113} height={97} className="mx-auto mt-2" />
        </div>
      )}
    </footer>
  );
}
