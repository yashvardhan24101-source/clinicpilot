const { SignJWT } = require("jose");
const fs = require("fs");
const { execSync } = require("child_process");

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.PORT) return `http://localhost:${process.env.PORT}`;
  return "http://localhost:3000";
}

async function getToken() {
  let secret = process.env.SESSION_SECRET;
  if (!secret && fs.existsSync(".env.local")) {
    const env = fs.readFileSync(".env.local", "utf-8");
    const m = env.match(/SESSION_SECRET=(.*)/);
    if (m && m[1].trim()) {
      secret = m[1].trim();
    }
  }
  const secretKey = secret || "dev-clinicpilot-secret-32-chars-long-local-jwt";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  return await new SignJWT({
    user_id: "usr-reception-1",
    name: "Priya Sharma",
    email: "reception@smilecraft.in",
    role: "receptionist",
    clinic_id: "clinic-1",
    clinic_name: "SmileCraft Dental",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key);
}

function calculateMedian(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

async function verifyAuthenticatedPageLoads(baseUrl, path, token, expectedHeading) {
  const url = `${baseUrl}${path}`;
  let response;
  let attempts = 0;

  while (attempts < 3) {
    try {
      response = await fetch(url, {
        headers: {
          cookie: `clinicpilot_session=${token}`,
        },
        redirect: "manual",
      });
      break;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (response.status !== 200) {
    throw new Error(
      `Auth verification failed for ${path}: Expected HTTP 200, received HTTP ${response.status}. Redirect to login detected!`
    );
  }

  const html = await response.text();

  if (html.includes("Clinic Staff & Doctor Login") || html.includes('id="staff-email"')) {
    throw new Error(
      `Auth verification failed for ${path}: Login form was rendered! Authenticated session was rejected.`
    );
  }

  if (expectedHeading && !html.includes(expectedHeading)) {
    throw new Error(
      `Auth verification failed for ${path}: Expected page heading "${expectedHeading}" was not found in rendered HTML.`
    );
  }

  console.log(
    `[PROVED AUTH]: ${path} responded HTTP 200, confirmed staff heading "${expectedHeading}", and confirmed login form is absent.`
  );
}

async function run() {
  const baseUrl = getBaseUrl();
  const token = await getToken();
  console.log(`\n======================================================`);
  console.log(`ClinicPilot Authenticated Lighthouse Suite`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Session Token Generated for Receptionist (SmileCraft Dental)`);
  console.log(`======================================================\n`);

  const pages = [
    {
      name: "today",
      path: "/today",
      expectedHeading: "Today&#x27;s Clinic Schedule",
      perfThreshold: 90,
      a11yThreshold: 95,
      bpThreshold: 95,
    },
    {
      name: "calendar",
      path: "/calendar",
      expectedHeading: "Clinic Calendar Grid",
      perfThreshold: 85, // Documented exception: FullCalendar bundle hydration
      a11yThreshold: 95,
      bpThreshold: 95,
    },
    {
      name: "inbox",
      path: "/inbox",
      expectedHeading: "WhatsApp Inbox",
      perfThreshold: 90,
      a11yThreshold: 95,
      bpThreshold: 95,
    },
    {
      name: "patients",
      path: "/patients",
      expectedHeading: "Patients Directory",
      perfThreshold: 90,
      a11yThreshold: 95,
      bpThreshold: 95,
    },
  ];

  let hasFailures = false;
  const summaryResults = [];

  for (const page of pages) {
    console.log(`\n------------------------------------------------------`);
    console.log(`1. Verifying Authenticated Load for ${page.path}`);
    console.log(`------------------------------------------------------`);
    await verifyAuthenticatedPageLoads(baseUrl, page.path, token, page.expectedHeading);

    const perfScores = [];
    const a11yScores = [];
    const bpScores = [];

    console.log(`\n2. Running 3 Lighthouse Audits for ${page.name} (${page.path})`);
    for (let runIndex = 1; runIndex <= 3; runIndex++) {
      const outputPath = `./lh-temp-${page.name}-run${runIndex}.json`;
      const cmd = `npx --yes lighthouse "${baseUrl}${page.path}" --output=json --output-path="${outputPath}" --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu" --extra-headers="{\\"Cookie\\":\\"clinicpilot_session=${token}\\"}" --quiet`;

      try {
        execSync(cmd, { stdio: "ignore" });
        const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
        const perf = Math.round((data.categories.performance?.score || 0) * 100);
        const a11y = Math.round((data.categories.accessibility?.score || 0) * 100);
        const bp = Math.round((data.categories["best-practices"]?.score || 0) * 100);

        perfScores.push(perf);
        a11yScores.push(a11y);
        bpScores.push(bp);

        console.log(`  Run ${runIndex}/3: Perf=${perf}, A11y=${a11y}, BestPractices=${bp}`);
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`  Error in Run ${runIndex} for ${page.name}:`, err.message);
        hasFailures = true;
      }
    }

    const medianPerf = calculateMedian(perfScores);
    const medianA11y = calculateMedian(a11yScores);
    const medianBp = calculateMedian(bpScores);

    const perfPass = medianPerf >= page.perfThreshold;
    const a11yPass = medianA11y >= page.a11yThreshold;
    const bpPass = medianBp >= page.bpThreshold;

    const pagePassed = perfPass && a11yPass && bpPass;
    if (!pagePassed) {
      hasFailures = true;
    }

    summaryResults.push({
      page: page.name,
      path: page.path,
      medianPerf,
      perfThreshold: page.perfThreshold,
      perfPass,
      medianA11y,
      a11yThreshold: page.a11yThreshold,
      a11yPass,
      medianBp,
      bpThreshold: page.bpThreshold,
      bpPass,
      passed: pagePassed,
    });
  }

  console.log(`\n======================================================`);
  console.log(`Authenticated Lighthouse Audit Summary (3-Run Median)`);
  console.log(`======================================================`);
  console.table(
    summaryResults.map((r) => ({
      Page: r.page,
      "Perf (Med/Min)": `${r.medianPerf} / ${r.perfThreshold} ${r.perfPass ? "PASS" : "FAIL"}`,
      "A11y (Med/Min)": `${r.medianA11y} / ${r.a11yThreshold} ${r.a11yPass ? "PASS" : "FAIL"}`,
      "BP (Med/Min)": `${r.medianBp} / ${r.bpThreshold} ${r.bpPass ? "PASS" : "FAIL"}`,
      Status: r.passed ? "PASS" : "FAIL",
    }))
  );

  if (hasFailures) {
    console.error(`\n[FATAL CI AUDIT]: One or more authenticated routes missed Lighthouse threshold!`);
    process.exit(1);
  } else {
    console.log(`\n[SUCCESS CI AUDIT]: All authenticated routes passed Lighthouse threshold!`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Fatal error during Lighthouse authenticated audit:", err);
  process.exit(1);
});
