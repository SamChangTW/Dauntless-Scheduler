import json, urllib.request
API = "https://script.google.com/macros/s/REPLACE_EXEC/exec"
def req(url, data=None):
    try:
        if data is None:
            with urllib.request.urlopen(url, timeout=10) as r:
                return r.getcode(), r.read().decode('utf-8')
        else:
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.getcode(), r.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)
print("GET ping...", *req(API+"?ping=1"), sep="\n")
print("POST addSchedule...", *req(API, {"action":"addSchedule","date":"2025-11-16","time":["09:00","10:00"],"venue":"海客","notes":"diagnose"}), sep="\n")
