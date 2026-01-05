import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import SampleEntryChoice from './pages/SampleEntryChoice';
import SampleEntryForm from './pages/SampleEntryForm';
import SampleTracking from './pages/SampleTracking';
import ReportHandling from './pages/ReportHandling';
import ReportAnalyser from './pages/ReportAnalyser';
import ReportReview from './pages/ReportReview';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sample-entry" element={<SampleEntryChoice />} />
          <Route path="/sample-entry/form" element={<SampleEntryForm />} />
          <Route path="/sample-entry/tracking" element={<SampleTracking />} />
          <Route path="/report-handling" element={<ReportHandling />} />
          <Route path="/report-review/:reportId" element={<ReportReview />} />
          <Route path="/report-analyser" element={<ReportAnalyser />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
