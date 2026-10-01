import Link from "next/link";

export const PATH_DISCLAIMER_TEXT =
  "CMMC Ready is a self-assessment aid, not a CMMC assessment or certification. Only a C3PAO/DIBCAC certifies; only your Affirming Official affirms in SPRS.";

export type PathFooterProps = {
  showDesignShowcaseLink: boolean;
};

export function PathFooter({ showDesignShowcaseLink }: PathFooterProps) {
  return (
    <footer className="flex flex-col items-center gap-2 border-t-2 border-border pt-4 text-center">
      <p className="text-xs font-medium leading-snug text-muted">{PATH_DISCLAIMER_TEXT}</p>
      {showDesignShowcaseLink ? (
        <Link href="/design" className="caption text-muted underline underline-offset-4 hover:text-primary">
          Design showcase
        </Link>
      ) : null}
    </footer>
  );
}
