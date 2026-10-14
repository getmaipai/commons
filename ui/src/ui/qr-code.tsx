import { QRCodeSVG } from "qrcode.react";

export type QrCodeProps = {
  value: string;
  size: number;
  /** Accessible name announced by assistive technology. */
  label: string;
};

/** A locally rendered QR code with a scan-safe light quiet zone in every theme. */
export function QrCode({ value, size, label }: QrCodeProps) {
  return (
    <span
      style={{
        backgroundColor: "var(--qr-background, #ffffff)",
        color: "var(--qr-foreground, #000000)",
        display: "inline-flex",
        padding: "var(--qr-quiet-zone, 4px)",
      }}
    >
      <QRCodeSVG
        aria-label={label}
        bgColor="var(--qr-background, #ffffff)"
        fgColor="var(--qr-foreground, #000000)"
        role="img"
        size={size}
        value={value}
      />
    </span>
  );
}
