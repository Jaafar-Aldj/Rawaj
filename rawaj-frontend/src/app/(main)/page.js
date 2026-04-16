// src/app/page.js
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import AnalyticsSection from '@/components/AnalyticsSection';
import ResourcesSection from '@/components/ResourcesSection';
import ContactSection from '@/components/ContactSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <AnalyticsSection />
      <ResourcesSection />
      <ContactSection />
    </>
  );
}