import { Link } from "react-router";
import Logo from "../../../../assets/images/logos/darklogo.svg";
import Logowhite from "../../../../assets/images/logos/whitelogo.svg";
import { cn, hitArea } from "../../../../../utils";

interface FullLogoProps {
  /** Show the whole wordmark at every width. Unset, the logo is cropped to its 40 px mark below the `lg` breakpoint, which suits the
   * header and the collapsed rail but cuts the logo off on a phone sign-in page. */
  full?: boolean;
}

const FullLogo = ({ full = false }: FullLogoProps = {}) => {
  return (
    <Link to={'/'} data-full={full ? "" : undefined} className={cn("relative block overflow-hidden", full ? "max-w-[120px]" : "max-w-[40px] lg:max-w-[120px]", hitArea(2))}>
      {/* Dark Logo   */}
      <img
        src={Logo}
        alt='logo'
        width={100}
        height={32}
        className='block dark:hidden max-w-[120px] rtl:scale-x-[-1]'
      />
      {/* Light Logo  */}
      <img
        src={Logowhite}
        alt='logo'
        width={100}
        height={32}
        className='hidden dark:block max-w-[120px] rtl:scale-x-[-1]'
      />
    </Link>

  );
};

export default FullLogo;
