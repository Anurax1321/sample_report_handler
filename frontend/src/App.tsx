import { useEffect, useState } from "react";
import api from "./lib/api";

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    api.get("/health")
      .then(res => setStatus(res.data.status ?? "ok"))
      .catch(() => setStatus("backend not reachable"));
  }, []);

  return (
    <main style={{padding: 20, fontFamily: "system-ui"}}>
      <h1>sample_report_handler</h1>
      <p>Backend health: <b>{status}</b></p>
    </main>
  );
}
