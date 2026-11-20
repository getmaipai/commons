# Compare two sweeps made by ksweep.mjs: python3 sweepdiff.py <before-label> <after-label> (files in $SWEEP_OUT or /tmp). Lists every element whose
# computed position or box changed, and every element whose class says absolute, fixed or sticky but whose computed position does not.
import os
import json,sys
a=json.load(open(os.environ.get('SWEEP_OUT','/tmp')+'/sweep-%s.json'%sys.argv[1])); b=json.load(open(os.environ.get('SWEEP_OUT','/tmp')+'/sweep-%s.json'%sys.argv[2]))
tot=0; diffs=[]
for k in a:
    A=a[k]; B=b.get(k,[])
    if len(A)!=len(B): diffs.append((k,"count",len(A),len(B)))
    # align by (tag,label,occurrence)
    from collections import defaultdict
    def idx(L):
        d={}; c=defaultdict(int)
        for e in L:
            key=(e['tag'],e['label']); n=c[key]; c[key]+=1; d[(key,n)]=e
        return d
    ia,ib=idx(A),idx(B)
    for key,e in ia.items():
        f=ib.get(key)
        if not f: diffs.append((k,"missing-after",key[0],e['pos'])); continue
        tot+=1
        if e['pos']!=f['pos']: diffs.append((k,"pos",key[0],e['pos'],f['pos']))
        elif abs(e['x']-f['x'])>1 or abs(e['y']-f['y'])>1 or abs(e['w']-f['w'])>1 or abs(e['h']-f['h'])>1: diffs.append((k,"box",key[0],(e['x'],e['y'],e['w'],e['h']),(f['x'],f['y'],f['w'],f['h'])))
    for key,f in ib.items():
        if key not in ia: diffs.append((k,"new-after",key[0][0],f['pos']))
    # class says absolute etc but computed differs
print("compared",tot,"elements; differences:",len(diffs))
for d in diffs[:60]: print(d)
bad=[(k,e['tag'],e['label'],e['wantPos'],e['pos']) for k,L in b.items() for e in L if e['wantPos'] and e['wantPos']!=e['pos']]
print("elements whose class says",'absolute/fixed/sticky','but computed differs (after):',len(bad)); print(bad[:10])
bad0=[(k,e['tag'],e['label'],e['wantPos'],e['pos']) for k,L in a.items() for e in L if e['wantPos'] and e['wantPos']!=e['pos']]
print("same check on the baseline:",len(bad0))
