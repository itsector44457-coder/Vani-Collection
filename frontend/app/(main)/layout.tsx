import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FloatingContactMenu from "../../components/FloatingContactMenu";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-grow pb-16 lg:pb-0">{children}</main>
      <Footer />
      <FloatingContactMenu />
    </>
  );
}
