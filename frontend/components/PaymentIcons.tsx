import Image from "next/image";

/** Local SVG marks keep the footer crisp and independent of third-party image hosts. */
export default function PaymentIcons() {
  const badge = "flex h-8 min-w-12 items-center justify-center rounded border border-white/20 bg-white px-2";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
      <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">We accept</span>
      <span className={badge} title="UPI">
        <Image src="/payments/upi.svg" alt="UPI" width={43} height={23} />
      </span>
      <span className={badge} title="Visa">
        <Image src="/payments/visa.svg" alt="Visa" width={36} height={22} />
      </span>
      <span className={badge} title="Mastercard">
        <Image src="/payments/mastercard.svg" alt="Mastercard" width={35} height={22} />
      </span>
      <span className={badge} title="Net banking">
        <svg role="img" aria-label="Net banking" width="27" height="23" viewBox="0 0 28 24" fill="none" stroke="#405679" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 11-6 11 6H3ZM5 20h18M3 23h22M7 11v6m7-6v6m7-6v6" /></svg>
      </span>
      <span className={`${badge} gap-1.5`} title="Cash on delivery">
        <svg role="img" aria-label="Cash on delivery" width="27" height="23" viewBox="0 0 28 24" fill="none" stroke="#3f7053" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="24" height="17" rx="2" /><path d="M5 7c2 0 3-1 3-2m12 0c0 1 1 2 3 2M5 16c2 0 3 1 3 2m12 0c0-1 1-2 3-2M12 8h5m-5 3h5m-5-3c4 0 4 5 0 5l4 3" /></svg>
        <span className="text-[8px] font-bold leading-tight text-[#3f7053]" aria-hidden="true">CASH ON<br />DELIVERY</span>
      </span>
    </div>
  );
}
