import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { VolumePage } from './pages/VolumePage';
import { ChapterPage } from './pages/ChapterPage';
import { SearchPage } from './pages/SearchPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="volume/:volumeNum" element={<VolumePage />} />
        <Route path="volume/:volumeNum/chapter/:chapterNum" element={<ChapterPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
    </Routes>
  );
}

export default App;
