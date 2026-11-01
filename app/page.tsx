import { ParticlesBackground } from '@/components/ParticlesBackground';
import { ChainSearch } from '@/components/search/ChainSearch';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-[5%] pb-32 pt-[18vh] text-center md:px-[18%] md:pt-[25vh]">
      <ParticlesBackground />
      <div className="relative z-10">
        <h1 className="font-display text-[1.7rem] text-white md:text-5xl">Blockchain Search Engine</h1>
        <p className="mb-6 mt-6 text-[1.3rem] italic text-white md:mt-8 md:not-italic">
          Search any blockchain for any cryptocurrency address, transactions, block, data, etc.
        </p>
        <ChainSearch />
      </div>
    </main>
  );
}
