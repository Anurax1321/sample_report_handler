import Header from './components/Header';
import SampleEntry from './components/SampleEntry';
import ReportHandling from './components/ReportHandling';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="container">
          <div className="divisions">
            <div className="division">
              <SampleEntry />
            </div>
            <div className="division">
              <ReportHandling />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
