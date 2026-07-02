import re

content = """
**Parameter** **Frequency** **Parameter** **Frequency**

---

?q= 5.5% ?text= 0.3%

?s= 4.5% ?handler= 0.2%

?search= 1.9% ?myord= 0.2%

?id= 1.7% ?myshownums= 0.2%

?lang= 1.4% ?id_site= 0.2%

?keyword= 1.2% ?city= 0.2%

?query= 1.1% ?search_query= 0.2%

?page= 1.0% ?msg= 0.2%

?keywords= 0.8% ?sortby= 0.2%

?year= 0.8% ?mode= 0.2%

?view= 0.8% ?CODE= 0.2%

?email= 0.8% ?location= 0.2%

?type= 0.7% ?v= 0.2%

?name= 0.7% ?order= 0.2%

?p= 0.7% ?n= 0.2%

?month= 0.6% ?term= 0.2%

?immagine= 0.6% ?start= 0.2%

?list_type= 0.5% ?k= 0.2%

?url= 0.5% ?redirect= 0.2%

?terms= 0.5% ?ref= 0.2%

?categoryid= 0.5% ?file= 0.2%

?key= 0.5% ?country= 0.2%

?l= 0.5% ?from= 0.1%

?begindate= 0.4% ?r= 0.1%

?enddate= 0.4% ?f= 0.1%

?categoryid2= 0.4% ?field%5B%5D= 0.1%

?t= 0.4% ?searchScope= 0.1%

?cat= 0.4% ?state= 0.1%

?category= 0.4% ?phone= 0.1%

?action= 0.4% ?Itemid= 0.1%

?bukva= 0.4% ?lng= 0.1%

?redirect_uri= 0.4% ?place= 0.1%

?firstname= 0.4% ?bedrooms= 0.1%

?c= 0.4% ?expand= 0.1%

?lastname= 0.3% ?e= 0.1%

?uid= 0.3% ?price= 0.1%

?startTime= 0.3% ?d= 0.1%

?eventSearch= 0.3% ?path= 0.1%

?categoryids2= 0.3% ?address= 0.1%

?categoryids= 0.3% ?day= 0.1%

?sort= 0.3% ?display= 0.1%

?positiontitle= 0.3% ?a= 0.1%

?groupid= 0.3% ?error= 0.1%

?m= 0.3% ?form= 0.1%

?message= 0.3% ?language= 0.1%

?tag= 0.3% ?mls= 0.1%

?pn= 0.3% ?kw= 0.1%

?title= 0.3% ?u= 0.1%

?orgId= 0.3%
"""

lines = [line.strip() for line in content.split("\n") if line.strip() and not line.startswith("---") and not line.startswith("**")]
res = "| Parameter | Frequency | Parameter | Frequency |\n|---|---|---|---|\n"
for line in lines:
    parts = line.split()
    if len(parts) == 4:
        res += f"| `{parts[0]}` | {parts[1]} | `{parts[2]}` | {parts[3]} |\n"
    elif len(parts) == 2:
        res += f"| `{parts[0]}` | {parts[1]} | | |\n"

print("TABLE 1:\n")
print(res)

content2 = """
/?s= 3.6

/search?q= 2.5

/index.php?lang= 0.6

/pplay/info_prenotazioni.asp?immagine= 0.6

/shared/lgflsearch.php?terms= 0.5

/index.php?page= 0.4

/search?query= 0.4

/index.php?bukva= 0.4

/pro/events_print_setup.cfm?list_type= 0.3

/pro/events_print_setup.cfm?categoryid= 0.3

/pro/events_print_setup.cfm?categoryid2= 0.3

/?eventSearch= 0.3

/?startTime= 0.3

/pro/events_ical.cfm?categoryids= 0.3

/pro/events_ical.cfm?categoryids2= 0.3

/pro/events_print_setup.cfm?month= 0.3

/pro/events_print_setup.cfm?year= 0.3

/pro/events_print_setup.cfm?begindate= 0.3

/pro/events_print_setup.cfm?enddate= 0.3

/search?keyword= 0.3

/?q= 0.3
"""

lines2 = [line.strip() for line in content2.split("\n") if line.strip()]
res2 = "| Path + Parameter | Frequency Score |\n|---|---|\n"
for line in lines2:
    parts = line.split()
    if len(parts) == 2:
        res2 += f"| `{parts[0]}` | {parts[1]} |\n"

print("TABLE 2:\n")
print(res2)
