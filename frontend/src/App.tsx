// Root application shell: defines the shared layout (header, main content, mobile
// nav, footer) and the React Router route table. Every page renders inside
// <Outlet/> within the constrained Container.

import { useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";

import HomePage from "@/pages/HomePage";
import SceneListPage from "@/pages/SceneListPage";
import SceneDetailPage from "@/pages/SceneDetailPage";
import PerformerListPage from "@/pages/PerformerListPage";
import PerformerDetailPage from "@/pages/PerformerDetailPage";
import StudioListPage from "@/pages/StudioListPage";
import StudioDetailPage from "@/pages/StudioDetailPage";
import TagListPage from "@/pages/TagListPage";
import TagDetailPage from "@/pages/TagDetailPage";
import SearchPage from "@/pages/SearchPage";
import HistoryPage from "@/pages/HistoryPage";

// Scrolls back to the top whenever the route path changes.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Persistent chrome wrapping every routed page.
function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <Container>
            <Outlet />
          </Container>
        </main>
      </div>
      <MobileNav />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/scenes" element={<SceneListPage />} />
          <Route path="/scenes/:id" element={<SceneDetailPage />} />
          <Route path="/performers" element={<PerformerListPage />} />
          <Route path="/performers/:id" element={<PerformerDetailPage />} />
          <Route path="/studios" element={<StudioListPage />} />
          <Route path="/studios/:id" element={<StudioDetailPage />} />
          <Route path="/tags" element={<TagListPage />} />
          <Route path="/tags/:id" element={<TagDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </>
  );
}
