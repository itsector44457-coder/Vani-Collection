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
      <main className="flex-grow">{children}</main>
      <Footer />
      <FloatingContactMenu />
    </>
  );
}
