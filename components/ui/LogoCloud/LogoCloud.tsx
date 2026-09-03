import Image from 'next/image';

const LogoCloud = () => (
  <div>
    <p className="mt-24 text-xs uppercase font-body text-club text-center font-bold tracking-[0.3em]">
      Powered by
    </p>
    <div className="flex flex-col items-center mt-5 space-y-2 sm:space-y-0 sm:flex-row sm:justify-center sm:space-x-10">
      <div className="flex items-center justify-start h-12">
        <Image
          src="/nextjs.svg"
          alt="Next.js"
          width={118}
          height={24}
          unoptimized
        />
      </div>
      <div className="flex items-center justify-start h-12">
        <Image
          src="/stripe.svg"
          alt="Stripe"
          width={67}
          height={32}
          unoptimized
        />
      </div>
      <div className="flex items-center justify-start h-12">
        <Image
          src="/supabase.svg"
          alt="Supabase"
          width={152}
          height={32}
          unoptimized
        />
      </div>
    </div>
  </div>
);

export default LogoCloud;
