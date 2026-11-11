"""Rebuild the website and replace ../maths-by-amarjeet-sir/ with the new files."""
import os, shutil, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
os.makedirs("dist", exist_ok=True)
subprocess.run([sys.executable, "build3.py"], check=True)
target = os.path.normpath(os.path.join(here, "..", "maths-by-amarjeet-sir"))
os.makedirs(target, exist_ok=True)
for name in os.listdir(target):
    p = os.path.join(target, name)
    shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
for name in os.listdir("site_pkg"):
    s, d = os.path.join("site_pkg", name), os.path.join(target, name)
    shutil.copytree(s, d) if os.path.isdir(s) else shutil.copy2(s, d)
print("Published", sorted(os.listdir(target)), "to", target)

# Keep the Batches section of the Northeast PSC home page in step with this site's batch list.
try:
    import subprocess, sys
    _sync = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools", "sync_batches.py")
    if os.path.exists(_sync): print(subprocess.run([sys.executable, _sync], capture_output=True, text=True).stdout.splitlines()[0])
except Exception as _e:
    print("home page batches not updated:", _e)
