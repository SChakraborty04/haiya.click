import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeatureGrid from '../components/FeatureGrid';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', fontFamily: '"Space Mono", monospace' }}>
      <Header />
      <HeroSection />
      <FeatureGrid />
      <Footer />
    </div>
  );
}
