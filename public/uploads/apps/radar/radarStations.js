// list of US weather radar sites to view

SAGE2_radarStations = [];
SAGE2_radarStations[0] = {code:"LOT",
						name:"Chi",
						longName:"Chicago, IL"};
SAGE2_radarStations[1] = {code:"HMO",
						name:"Haw",
						longName:"Molokai, HI"};
SAGE2_radarStations[2] = {code:"NKX",
						name:"San D",
						longName:"San Diego, CA"};
SAGE2_radarStations[3] = {code:"OKX",
						name:"New Y",
						longName:"New York, NY"};
SAGE2_radarStations[4] = {code:"GRK",
						name:"Aus",
						longName:"Austin, TX"};

// codes from http://www.glenallenweather.com/alink/15radar/radarstat.htm
/*
AHG    Anchorage/Kenei, AK     
AIH    Middleton Islands, AK     
MXX    Carrville/Maxwell AFB, AL     
EOX    Ft. Rucker, AL     
MOB    Mobile, AL   
HTX    N.E./Hytop, AL   
BMX    Shelby County AP/Birmingham, AL    
LZK    Little Rock, AR   
SRX    Western Arkansas/Ft. Smith, AR     
FSX    Flagstaff, AZ    
EMX    Tucson, AZ    
IWA    Williams AFB/Phoenix, AZ   
YUX    Yuma, AZ    
BBX    Beale AFB, CA    
EYX    Edwards AFB, CA   
BHX    Eureka, CA    CA 
HNX    Hanford AP/San Joaquin Valley, CA   
DAX    McClellan AFB/Sacremento, CA   
MUX    Mt Umunhum/San Francisco, CA    
NKX    San Diego, CA   
SOX    Santa Ana Mountains/March AFB, CA   
VTX    Sulphur Mtn/Los Angeles, CA    
VBX    Vandenberg AFB, CA   
FTG    Front Range AP/Denver, CO    
GJX    Grand Junction, CO     
PUX    Pueblo, CO    
LWX    Sterling, VA/Washington DC     
DOX    Dover AFB, DE   
JAX    Jacksonville, FL   
BYX    Key West, FL    
MLB    Melbourne, FL    
AMX    Miami, FL    
EVX    Red Bay/Eglin AFB, FL   
TBW    Ruskin/Tampa Bay, FL    
TLH    Tallahassee, FL   
VAX    Moody AFB, GA    
FFC    Peach Tree City/Atlanta, GA    
JGX    Robins AFB, GA   
HKM    Kohala, HI    
HMO    Molokai, HI   
HWA    South Hawaii, HI   
HKI    South Kauai, HI   
DMX    Acorn Valley/Des Moines    IA 
DVN    Davenport/Quad Cities, IA   
CBX    Boise, ID   
SFX    Pocatello/Idaho falls, ID   
ILX    Central (Springfield), IL   
LOT    Chicago, IL   
IND    Indianapolis, IN    
IWX    Webster, IN     
DDC    Dodge City, KS   
GLD    Goodland, KS    
TWX    Wabaunsee County/Topeka, KS    
ICT    Wichita, KS    
LVX    Ft Knox Mil Res/Louisville, KY     
HPX    Ft. Campbell, KY     
JKL    Jackson, KY    
PAH    Paducah, KY   
POE    Ft Polk, LA    
LCH    Lake Charles, LA    
SHV    Shreveport, LA     
LIX    Slidell AP/New Orleans, LA   
BOX    Taunton/Boston, MA     
CBW    Caribou (Loring AFB), ME    
GYX    Gray/Portland, ME    
APX    Alpena/Gaylord, MI    
GRR    Grand Rapids/Muskegon, MI    
MQT    Marquette, MI   
DTX    Pontiac/Detroit, MI     
MPX    Chanhassen Township/Minn-St.P, MN  
DLH    Duluth, MN    
EAX    Pleasant Hill/KC, MO    
SGF    Springfield, MO   
LSX    St Charles City/St Louis, MO     
GWX    Columbus AFB, MS   
JAN    Jackson, MS    
BLX    Billings, MT    
GGW    Glasgow, MT    
TFX    Great Falls, MT   
MSX    Pt Six Mtn/Missoula, MT    
LNX    North Platte, NB   
MHX    Newport/Morehead City, NC    
LTX    Shallotte/Wilmington, NC    
RAX    Triple West AP/Raleigh-Durham, NC   
BIS    Bismarck, ND     
MVX    Fargo, ND     
MBX    Minot AFB, ND    
UEX    Grand Island, NE   
OAX    Omaha, NE   
ABX    La Mesita Negra/Albuquerque, NM    
FDX    Field Village/Cannon AFB, NM   
HDX    Holloman AFB, NM   
LRX    Elko, NV    
ESC    Las Vegas, NV   
RGX    Virginia Peak/Reno, NV    
BGM    Binghamton, NY    
OKX    Brookhaven/New York City, NY   
BUF    Buffalo, NY   
ENX    East Berne/Albany, NY   
TYX    Ft Drum AFB/Montague, NY    
CLE    Cleveland, OH    
ILN    Wilmington/Cincinnati, OH   
FDR    Frederick, OK    
INX    Shreck Farm/Tulsa, OK   
TLX    Twin Lakes/Oklahoma City, OK    
VNX    Vance AFB, OK    
MAX    Medford, OR   
PDT    Pendleton, OR   
RTX    Portland, OR   
PBZ    Coraopolis/Pittsburgh, PA    
DIX    Fort Dix, NJ/Philadelphia, PA     
CCX    Moshannon St Forest/State College, PA    
JUA    San Juan, PR    
CLX    Charleston, SC    
CAE    Columbia, SC    
GSP    Greenville/Spartanburg (Greer), SC    
ABR    Aberdeen   SD 
UDX    Rapid City, SD    
FSD    Sioux Falls, SD   
MRX    Knoxville, TN     
NQA    Millington NAS/Memphis, TN     
OHX    Old Hickory Mt/Nashville, TN    
AMA    Amarillo, TX    
DFX    Bracketville/Laughlin AFB, TX     
BRO    Brownsville, TX    
GRK    Central Texas (Ft Hood), TX    
CRP    Corpus Christi, TX    
EPZ    El Paso, TX    
HGX    League City/Houston, TX    
LBB    Lubbock, TX    
MAF    Midland/Odessa, TX    
DYX    Moran/Dyess AFB, TX    
EWX    New Braunfels AP/Austin-San Ant, TX    
SJT    San Angelo, TX    
FWS    Spinks AP/Dallas-Ft Worth, TX   
ICX    Cedar City, UT    
MTX    Promontory Pt/Salt Lake City, UT    
FCX    Roanoke, VA    
AKQ    Wakefield/Norfolk-Richmond, VA    
LWX    Sterling, VA/Washington DC   
CXX    Burlington, VT    
ATX    Everett/Seattle-Tacoma, WA    
OTX    Spokane, WA    
GRB    Green Bay, WI    
ARX    LaCrosse, WI     
MKX    Sullivan Township/Milwaukee, WI    
RLX    Charleston, WV     
CYS    Cheyenne, WY    
RIW    Riverton, WY
    */