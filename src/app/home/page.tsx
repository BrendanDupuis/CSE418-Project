"use client";

  import { signOut } from "firebase/auth";
  import { firebaseAuth } from "@/lib/firebase";

  export default function HomePage() {
      const a = 2;

      return (
          <div>
              <button onClick={() => signOut(firebaseAuth)}>Sign Out</button>
              <p>HOME PAGE {a}</p>
          </div>
      );
  }

