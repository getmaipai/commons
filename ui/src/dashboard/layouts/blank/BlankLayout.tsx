import { Outlet } from "react-router";
import ScrollToTop from "../../components/shared/ScrollToTop";

const BlankLayout = () => (
  <>
    <ScrollToTop>
      <Outlet />
    </ScrollToTop>
  </>
);

export default BlankLayout;
