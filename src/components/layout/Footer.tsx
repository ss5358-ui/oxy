export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} oxylink. 
      </div>
    </footer>
  );
}
