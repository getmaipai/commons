import StyleDivider from '../../../components/shared/StyleDivider';
import StyleAwareWrapper from '../../../components/shared/StyleAwareWrapper';
import BreadcrumbComp from '../../../layouts/full/shared/breadcrumb/BreadcrumbComp';
import FormCompo from '../../../components/form';
const BCrumb = [{ to: '/', title: 'Home' }, { title: 'Form' }];

function TablesPage() {
  return (
    <StyleAwareWrapper lyraClassName="flex flex-col p-px gap-px bg-border">
      <BreadcrumbComp title="Form Elements" items={BCrumb} />
      <StyleDivider />
      <FormCompo />
    </StyleAwareWrapper>
  );
}

export default TablesPage;
