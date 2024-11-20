import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-1/2 h-1/2 bg-[#58a6ff] opacity-5 blur-3xl rounded-full"></div>
        <div className="absolute bottom-[20%] right-[20%] w-1/2 h-1/2 bg-[#238636] opacity-5 blur-3xl rounded-full"></div>
      </div>

      {children}
    </div>
  );
};

export default Layout;
