import { createRoot } from "react-dom/client";
import { Workspace } from "@/components/workspace";
import "./portable.css";

const mount = document.getElementById("navier");
if (mount) createRoot(mount).render(<Workspace portable/>);
