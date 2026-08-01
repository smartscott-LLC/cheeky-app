const LogoCloud = () => (
  <div>
    <p className="mt-24 text-xs uppercase text-zinc-400 text-center font-bold tracking-[0.3em]">
      Powered by
    </p>
    <div className="flex flex-col items-center mt-5 space-y-2 sm:space-y-0 sm:flex-row sm:justify-center sm:space-x-10">
      <div className="flex items-center justify-start h-12">
        <img src="/nextjs.svg" alt="Next.js" className="h-6 text-white" />
      </div>
      <div className="flex items-center justify-start h-12">
        <img src="/stripe.svg" alt="Stripe" className="h-8 text-white" />
      </div>
      <div className="flex items-center justify-start h-12">
        <img src="/supabase.svg" alt="Supabase" className="h-8 text-white" />
      </div>
    </div>
  </div>
);

export default LogoCloud;
