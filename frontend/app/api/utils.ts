import https from "https";

export function httpsGet(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    let completed = false;

    const safeReject = (err: Error) => {
      if (completed) return;
      completed = true;
      reject(err);
    };

    const safeResolve = (val: any) => {
      if (completed) return;
      completed = true;
      resolve(val);
    };

    const req = https
      .get(url, { headers, rejectUnauthorized: false, timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (completed) return;
          if (res.statusCode && res.statusCode >= 400) {
            safeReject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            try {
              if (!data || data.trim() === "") {
                safeReject(new Error("Empty response body"));
              } else {
                safeResolve(JSON.parse(data));
              }
            } catch (e: any) {
              safeReject(e);
            }
          }
        });
      });

    req.on("error", (err) => {
      safeReject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      safeReject(new Error("Request timeout"));
    });
  });
}
