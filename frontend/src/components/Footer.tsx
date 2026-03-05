import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer-text">
        &copy; {new Date().getFullYear()} Vijayrekha Life Sciences. All rights reserved.
      </p>
    </footer>
  );
}
