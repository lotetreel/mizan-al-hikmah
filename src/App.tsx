import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { VolumePage } from './pages/VolumePage';
import { ChapterPage } from './pages/ChapterPage';
import { SearchPage } from './pages/SearchPage';
import { Favorites } from './pages/Favorites';

// The ambient display carries its own canvas scenes, so it loads only when opened.
const AmbientPage = lazy(() => import('./pages/AmbientPage'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="volume/:volumeNum" element={<VolumePage />} />
        <Route path="volume/:volumeNum/chapter/:chapterNum" element={<ChapterPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="favorites" element={<Favorites />} />
      </Route>
      <Route
        path="ambient"
        element={
          <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
            <AmbientPage />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default App;
