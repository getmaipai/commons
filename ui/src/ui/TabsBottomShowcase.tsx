import { Tabs, TabsList, TabsTrigger } from "./tabs";

export function TabsBottomShowcase() {
  return <Tabs defaultValue="home" className="min-h-56"><div className="flex-1 p-4 text-muted-foreground">Phone content area</div><TabsList variant="bottom" position="sticky" aria-label="Main navigation"><TabsTrigger value="home"><span aria-hidden="true">⌂</span><span>Home</span></TabsTrigger><TabsTrigger value="search"><span aria-hidden="true">⌕</span><span>Search</span></TabsTrigger><TabsTrigger value="library"><span aria-hidden="true">▤</span><span>Library</span></TabsTrigger></TabsList></Tabs>;
}
