"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function UnlockPage() {
  // Immediately redirect to home - no password needed
  useEffect(() => {
    const handleRedirect = () => {
      window.location.assign("/");
    };
    // Redirect on mount
    handleRedirect();
    // Also listen for popstate to handle back button
    window.addEventListener("popstate", handleRedirect);
    return () => window.removeEventListener("popstate", handleRedirect);
  }, []);

  return null;
}