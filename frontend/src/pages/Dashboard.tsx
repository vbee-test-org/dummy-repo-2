const DashboardPage = () => {
  const metabaseDashboardUrl = "https://your-metabase-instance.com/public/dashboard-id";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] p-8">
      <h1 className="text-3xl font-semibold text-white mb-8">
        Dashboard
      </h1>
      <div className="w-full max-w-6xl h-[80vh] bg-[#161b22] rounded-lg overflow-hidden shadow-lg">
        <iframe
          src={metabaseDashboardUrl}
          title="Metabase Dashboard"
          className="w-full h-full"
          frameBorder="0"
          allowTransparency
        />
      </div>
    </div>
  );
};

export default DashboardPage;
