from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
app = Flask(__name__, template_folder='templates', static_folder='static'); CORS(app)
@app.get('/')
def home(): return render_template('index.html')
# DEMO DATA: skill -> (demand, supply, growth %, sector, seats)
SKILLS = {"AI/ML":(142000,81000,31,"IT",9000),"Python":(210000,190000,12,"IT",30000),"Data Analytics":(165000,120000,22,"IT",18000),
"Cybersecurity":(98000,52000,28,"IT",6000),"Cloud Computing":(125000,74000,26,"IT",9500),"Industrial Automation":(88000,61000,18,"Manufacturing",8000),
"Robotics":(40000,30000,20,"Automotive",3000),"Solar PV":(72000,49000,24,"Renewable Energy",7000),"EV Technology":(66000,36000,33,"Automotive",4000),
"CNC Programming":(55000,69000,3,"Manufacturing",12000)}
SECTORS = ["IT","Healthcare","Manufacturing","Finance","Logistics","Renewable Energy","Automotive","Construction"]
DIST = {"Maharashtra":{"Pune":.16,"Mumbai":.22,"Nashik":.07,"Nagpur":.08,"Chhatrapati Sambhajinagar":.05,"Kolhapur":.04},
"Karnataka":{"Bengaluru":.35,"Mysuru":.05},"Gujarat":{"Ahmedabad":.2,"Surat":.15},"Tamil Nadu":{"Chennai":.25,"Coimbatore":.1},
"Telangana":{"Hyderabad":.3},"Delhi":{"New Delhi":.5}}
ROLES = {"Data Analyst":["Python","SQL","Statistics","Power BI","Data Visualization"],"ML Engineer":["Python","Statistics","AI/ML","Cloud Computing"],
"Security Analyst":["Networking","Cybersecurity","Cloud Computing"],"Solar Technician":["Electrical Basics","Solar PV"]}
KW = {k.lower():k for k in list(SKILLS)+["SQL","Statistics","Power BI","Data Visualization","Excel","Tableau","Docker","AWS","Networking","Machine Learning"]}
def status(d,s):
    r=s/d
    return "Critical Shortage" if r<.65 else "Emerging Shortage" if r<.85 else "Balanced" if r<=1.1 else "Oversupply"
def rows(f=1.0):
    out=[]
    for k,(d,s,g,sec,seats) in SKILLS.items():
        d,s,seats=round(d*f),round(s*f),round(seats*f); gap=d-s; st=status(d,s)
        out.append(dict(skill=k,sector=sec,demand=d,supply=s,gap=gap,growth=g,status=st,seats=seats,
          priority="HIGH" if st=="Critical Shortage" else "MEDIUM" if st=="Emerging Shortage" else "LOW",
          recommended_seats=max(0,round(gap*.25,-1)) if gap>0 else 0))
    return out
def factor():
    d=request.args.get("district"); s=request.args.get("state")
    if d:
        for v in DIST.values():
            if d in v: return v[d]
    return sum(DIST[s].values()) if s in DIST else 1.0
def series(f,skill=None,m=1.0):
    d0,s0=(SKILLS[skill][0],SKILLS[skill][1]) if skill else (sum(v[0] for v in SKILLS.values()),sum(v[1] for v in SKILLS.values()))
    g=(SKILLS[skill][2] if skill else 20)/100*m
    return [dict(year=2026+t,demand=round(d0*f*(1+g)**t),supply=round(s0*f*(1.08)**t)) for t in range(5)]
@app.get("/api/dashboard")
def dashboard():
    f=factor(); r=rows(f); D=sum(x["demand"] for x in r); S=sum(x["supply"] for x in r)
    kp=[("Active Job Demand",D),("Workforce Supply",S),("Critical Skill Gaps",sum(x["status"]=="Critical Shortage" for x in r)),
    ("Emerging Skills",sum(x["growth"]>=24 for x in r)),("Training Capacity",sum(x["seats"] for x in r)),("Demand-Supply Alignment",round(S/D*100))]
    return jsonify(kpis=[dict(label=a,value=b) for a,b in kp],series=series(f),alerts=alerts_list(r))
def alerts_list(r):
    a=[]
    for x in r:
        if x["status"]=="Critical Shortage": a.append(dict(type="Critical skill shortage",skill=x["skill"],msg=f'{x["skill"]} demand exceeds supply by {x["gap"]:,}.'))
        if x["growth"]>=28: a.append(dict(type="Rapid demand growth",skill=x["skill"],msg=f'{x["skill"]} demand is growing faster than workforce supply (+{x["growth"]}%).'))
        if x["status"]=="Oversupply": a.append(dict(type="Oversupply",skill=x["skill"],msg=f'{x["skill"]} supply exceeds demand; avoid adding seats.'))
        if x["seats"]<x["gap"]*.8 and x["gap"]>0: a.append(dict(type="Low training capacity",skill=x["skill"],msg=f'{x["skill"]} seats cover under 80% of the gap.'))
    return a
@app.get("/api/alerts")
def alerts(): return jsonify(alerts_list(rows(factor())))
@app.get("/api/skill-gaps")
def gaps(): return jsonify(rows(factor()))
@app.get("/api/demand")
def demand(): return jsonify([dict(skill=x["skill"],sector=x["sector"],demand=x["demand"],growth=x["growth"]) for x in rows(factor())])
@app.get("/api/supply")
def supply(): return jsonify([dict(skill=x["skill"],supply=x["supply"],seats=x["seats"]) for x in rows(factor())])
@app.get("/api/forecast")
def forecast():
    sk=request.args.get("skill","AI/ML"); m={"optimistic":1.25,"base":1,"pessimistic":.7}[request.args.get("scenario","base")]
    s=series(factor(),sk,m); g=SKILLS[sk][2]*m
    return jsonify(series=s,current_demand=s[0]["demand"],forecast_demand=s[-1]["demand"],current_supply=s[0]["supply"],projected_gap=s[-1]["demand"]-s[-1]["supply"],growth_rate=round(g,1))
@app.get("/api/regional-insights")
def regional():
    f=factor(); r=rows(f)
    top=sorted(r,key=lambda x:-x["growth"])[:3]; worst=max(r,key=lambda x:x["gap"])
    return jsonify(demand=sum(x["demand"] for x in r),supply=sum(x["supply"] for x in r),training_capacity=sum(x["seats"] for x in r),
      skill_gap=sum(max(0,x["gap"]) for x in r),top_skills=[x["skill"] for x in top],sectors=list(dict.fromkeys(x["sector"] for x in sorted(r,key=lambda x:-x["gap"])))[:3],
      actions=[f'Add ~{worst["recommended_seats"]:,} {worst["skill"]} seats.',"Link ITIs/polytechnics with local employers.","Re-skill oversupplied trades into emerging ones."],skills=r)
@app.get("/api/training-capacity")
def training():
    d=request.args.get("district","Pune")
    return jsonify([dict(district=d,sector=x["sector"],trade=x["skill"],seats=x["seats"],enrolments=round(x["seats"]*.88),completions=round(x["seats"]*.74),
      placement=62+x["growth"]//2,demand=x["demand"],gap=x["gap"],recommended=x["seats"]+x["recommended_seats"]) for x in rows(factor())])
@app.get("/api/recommendations")
def recs():
    d=request.args.get("district","Pune"); out=[]
    for x in rows(factor()):
        if x["gap"]>0 and x["priority"]!="LOW":
            out.append(dict(district=d,sector=x["sector"],skill=x["skill"],demand=x["demand"],supply=x["supply"],gap=x["gap"],priority=x["priority"],
             headline=f'Increase {x["skill"]} training capacity by approximately {x["recommended_seats"]:,} seats.',
             Government=[f'Fund {x["recommended_seats"]:,} additional seats in {d}.',"Set district training targets."],
             Institute=[f'Launch/expand {x["skill"]} batches.',"Partner with local employers for placements."],
             Industry=["Offer apprenticeships and internships.","Share hiring forecasts with institutes."],
             Student=[f'Learn {x["skill"]}; demand grows {x["growth"]}%.',"Build 2 portfolio projects."]))
    return jsonify(out)
@app.get("/api/sectors")
def sectors(): return jsonify(SECTORS)
@app.get("/api/skills")
def skills(): return jsonify(list(SKILLS))
@app.get("/api/districts")
def districts(): return jsonify(DIST if not request.args.get("state") else list(DIST.get(request.args["state"],{})))
@app.post("/api/analyze-job")
def analyze():
    b=request.get_json(force=True); t=b.get("text","").lower(); have={s.lower() for s in b.get("skills",[])}
    det=sorted({v for k,v in KW.items() if k in t}); got=[s for s in det if s.lower() in have]; miss=[s for s in det if s.lower() not in have]
    return jsonify(detected=det,match=round(len(got)/len(det)*100) if det else 0,missing=miss,
      recommended=[s for s in miss if s in SKILLS][:3] or miss[:3])
@app.post("/api/skill-profile")
def profile():
    b=request.get_json(force=True); cur=[s.strip() for s in b.get("skills",[])]; req=ROLES.get(b.get("target","Data Analyst"),[])
    miss=[s for s in req if s.lower() not in {c.lower() for c in cur}]
    return jsonify(missing=miss,roadmap=req+["Projects",b.get("target","Data Analyst")])
if __name__=="__main__": app.run(port=5000,debug=True)
