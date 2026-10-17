"""Cliente mínimo de la API de PixelLab (v2). La clave se lee de .env (PIXELLAB_API_KEY), nunca del código.
Uso: python3 -I tools/pixellab_api.py <endpoint> <request.json> <salida.json>
Envía la petición; si devuelve un trabajo en segundo plano, espera a que termine y guarda la respuesta final."""
import json, os, subprocess, sys, time

BASE = "https://api.pixellab.ai/v2"

def key():
    for line in open(os.path.join(os.path.dirname(__file__), "..", ".env")):
        if line.startswith("PIXELLAB_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("falta PIXELLAB_API_KEY en .env")

def call(method, path, body=None):
    # curl en vez de urllib: el Python de python.org no trae certificados raíz
    cmd = ["curl", "-sS", "-X", method, BASE + path, "-H", f"Authorization: Bearer {key()}",
           "-H", "Content-Type: application/json", "-w", "\n%{http_code}"]
    if body is not None:
        cmd += ["--data-binary", "@-"]
    r = subprocess.run(cmd, input=json.dumps(body).encode() if body is not None else None, capture_output=True)
    text, _, code = r.stdout.decode().rpartition("\n")
    if not code.startswith("2"):
        raise SystemExit(f"HTTP {code} {path}: {text[:2000]} {r.stderr.decode()[:300]}")
    return json.loads(text or "{}")

def wait(job_id):
    while True:
        j = call("GET", f"/background-jobs/{job_id}")
        if j.get("status") != "processing":
            return j
        lr = j.get("last_response") or {}
        print(f"  {job_id}: procesando (cola {lr.get('queue_position')}, ~{lr.get('estimated_wait_seconds')} s)", flush=True)
        time.sleep(8)

def job_ids(r):
    ids = [r.get("background_job_id")] + list(r.get("background_job_ids") or [])
    return [i for i in ids if i]

if __name__ == "__main__":
    endpoint, req_file, out = sys.argv[1:4]
    r = call("POST", endpoint, json.load(open(req_file)))
    r["_jobs"] = [wait(i) for i in job_ids(r)]
    json.dump(r, open(out, "w"), indent=1)
    print(json.dumps({k: v for k, v in r.items() if k not in ("_jobs",)}, default=str)[:800])
    for j in r["_jobs"]:
        print("job", j.get("status"), json.dumps(j.get("last_response"), default=str)[:600])
    print("saldo", call("GET", "/balance"))
