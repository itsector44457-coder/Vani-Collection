"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { INSTAGRAM_URL } from "../lib/seo";
import { STORE_PHONE_E164, storeWhatsAppUrl } from "../lib/site-contact";

const WHATSAPP_URL = storeWhatsAppUrl("Hello Vani Collection!");

const iconProps = {
  viewBox: "0 0 24 24",
  width: 28,
  height: 28,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function ChatIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" fill="currentColor" stroke="none" />
      <path d="M7 8h10M7 12h7" stroke="#b89345" strokeWidth="1.7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="none">
      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.32.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.173.198-.297.297-.495.1-.198.05-.372-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.626.711.226 1.358.194 1.87.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.051 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.884 9.894-9.884a9.83 9.83 0 0 1 6.99 2.898 9.83 9.83 0 0 1 2.892 6.993c-.002 5.45-4.437 9.884-9.893 9.884m8.413-18.297A11.815 11.815 0 0 0 12.054 0C5.495 0 .16 5.335.157 11.893c0 2.096.547 4.142 1.588 5.946L.057 24l6.304-1.654a11.88 11.88 0 0 0 5.684 1.448h.005c6.558 0 11.893-5.335 11.896-11.893a11.82 11.82 0 0 0-3.481-8.413Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg {...iconProps} strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.7" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 2.5c-3.5 0-6.5 3-6.5 6.5 0 5 6.5 12.5 6.5 12.5s6.5-7.5 6.5-12.5c0-3.5-3-6.5-6.5-6.5z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <path d="m6 6 12 12M18 6 6 18" strokeWidth="2.6" />
    </svg>
  );
}

const contactItems = [
  { label: "Visit Guna Atelier & Contact", href: "/contact", Icon: LocationIcon, external: false },
  { label: "Chat on WhatsApp", href: WHATSAPP_URL, Icon: WhatsAppIcon, external: true },
  { label: "Call Vani Collection", href: `tel:${STORE_PHONE_E164}`, Icon: PhoneIcon, external: false },
  { label: "Visit Instagram", href: INSTAGRAM_URL, Icon: InstagramIcon, external: true },
];

export default function FloatingContactMenu() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-[5.25rem] right-4 z-[80] flex flex-col items-center gap-2.5 sm:right-6 lg:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div
            id="floating-contact-options"
            role="group"
            aria-label="Contact options"
            className="flex flex-col items-center gap-2.5"
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            exit="hidden"
            variants={{
              visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.075, staggerDirection: -1 } },
              hidden: { transition: { staggerChildren: reduceMotion ? 0 : 0.045, staggerDirection: 1 } },
            }}
          >
            {contactItems.map(({ label, href, Icon, external }) => (
              <motion.a
                key={label}
                href={href}
                aria-label={label}
                title={label}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 24, scale: reduceMotion ? 1 : 0.88 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: "spring", stiffness: 430, damping: 25 }}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-[#caa85f] text-white shadow-[0_8px_24px_rgba(66,47,19,0.22)] transition-colors hover:bg-[#b89345] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] focus-visible:ring-offset-2"
              >
                <Icon />
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Contact options band kare" : "Contact options khole"}
        aria-expanded={open}
        aria-controls="floating-contact-options"
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-[#caa85f] text-white shadow-[0_8px_24px_rgba(66,47,19,0.25)] transition-colors hover:bg-[#b89345] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "chat"}
            initial={reduceMotion ? false : { opacity: 0, rotate: -35, scale: 0.75 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, rotate: 35, scale: 0.75 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="flex h-7 w-7 items-center justify-center"
          >
            {open ? <CloseIcon /> : <ChatIcon />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
