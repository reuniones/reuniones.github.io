#!/bin/bash
#sleep 30
date
STATUS=0
while [  $STATUS -ne 0 ]; do
ntpdate 192.168.1.1 #actualizar hora del sistema
STATUS=$? #si es exitoso continuar con el script
echo "$STATUS"
sleep 1
done

wait
# linea de comandos de ffmpeg sin el destino
encodeparms="ffmpeg -xerror -f alsa -ac 1 -thread_queue_size 4096 -i hw:CARD=Device,DEV=0 -thread_queue_size 8096 -i 'rtsp://192.168.1.114:554/user=admin&password=&channel=1&stream=0.sdp?real_stream--rtp-caching=500' -filter:a agate=threshold=0.05,alimiter=limit=.3 -codec:a libfdk_aac -profile:a aac_he -cutoff 5000 -ar 32000 -b:a 32k -vcodec copy -aspect 16:9 -f flv "
#chusem=a
#encodeparms="avconv -f alsa -ac 1 -i hw:CARD=Device,DEV=0 -i 'rtsp://192.168.1.101:554/user=admin&password=&channel=1&stream=0.sdp&apos; -acodec aac -strict experimental -ar 32000  -b:a 48k -vcodec copy -aspect 16:9 -f flv "
#encodeparms="ffmpeg -f alsa -ac 1 -thread_queue_size 4096 -i hw:CARD=Device,DEV=0 -thread_queue_size 4096 -i 'rtsp://admin:888888@192.168.1.201:554/udp/av0_0' -map 0:0 -map 1:0 -filter:a alimiter=limit=.3 -codec:a libfdk_aac -profile:a aac_he -cutoff 5000 -ar 32000 -b:a 32k -vcodec copy -aspect 16:9 -f flv "
#encodeparms="ffmpeg -f alsa -ac 1 -thread_queue_size 4096 -i hw:CARD=Device,DEV=0 -thread_queue_size 8096 -i 'rtsp://192.168.0.123:554/user=admin&password=7yr2gp&channel=2&stream=0.sdp' -filter:a alimiter=limit=.3 -codec:a libfdk_aac -profile:a aac_he -cutoff 5000 -ar 32000 -b:a 32k -vcodec copy -aspect 16:9 -f flv "
#chusem=a

declare -i chusemini=0
declare -i chusemfin=0
declare -i chufinini=0
declare -i chufinfin=0
declare -i estsemini=0
declare -i estsemfin=0
declare -i estfinini=0
declare -i estfinfin=0
declare -i gazsemini=0
declare -i gazsemfin=0
declare -i gazfinini=0
declare -i gazfinfin=0
declare -i hour=0

chusemurl="'rtmp://publish.dailymotion.com/publish-dm/x4a2fbi?auth=Bj9s_4e2ba64cfc9b7a39b1b169e69446de16240e6e3f'" #url del digestor
chusemdia="Tue" #dia de reunion entre semana de churruarin
chusemini=19 #hora de inicio de reunion entre semana de churruarin
chusemfin=23 #hora de fin de reunion entre semana de churruarin
chufinurl="'rtmp://publish.dailymotion.com/publish-dm/x4jw7bs?auth=Blue_80c22a44c8ddf56bb2afe571c4bc3ac555021a02'"
chufindia="Sat"  #dia de reunion de fin de semana de churruarin
chufinini=18 #hora de inicio de reunion de fin de semana de churruarin
chufinfin=21 #hora de fin de reunion de fin de semana de churruarin
#tmpdig="'rtmp://publish.dailymotion.com/publish-dm/x4a290z?auth=Uisu_8a66d38bb6f2b491abf7ab5bb239d5219b0edeb2'"
#eval $encodeparms$tmpdig #linea de comandos final
#eval $commandline
#chufinurl=$chusemurl
estsemurl="'rtmp://publish.dailymotion.com/publish-dm/x4l21xi?auth=iLoH_737b64435284fa2dc36e39ebf39017fd5d691c07'" #url del digestor
estsemdia="Wed" #dia de reunion entre semana de este
estsemini=18 #hora de inicio de reunion entre semana de este
estsemfin=22 #hora de fin de reunion entre semana de este
estfinurl="'rtmp://publish.dailymotion.com/publish-dm/x4l22bb?auth=YpBk_f9e5c75b1c19dbc6b6decef13c844f4ccefff1f4'"
estfindia="Sun"  #dia de reunion de fin de semana de este
estfinini=17 #hora de inicio de reunion de fin de semana de este
estfinfin=21 #hora de fin de reunion de fin de semana de este

gazsemurl="'rtmp://publish.dailymotion.com/publish-dm/x4l2goz?auth=REPK_232423a0791125f7c93a2f437647309cd7900bdb'" #url del digestor
gazsemdia="Thu" #dia de reunion entre semana de gazzano
gazsemini=19 #hora de inicio de reunion entre semana de gazzano
gazsemfin=22 #hora de fin de reunion entre semana de gazzano
gazfinurl="'rtmp://publish.dailymotion.com/publish-dm/x4l2gkn?auth=1sx5_879c3d7352aa34c8e2d37654122666b03945e736'"
gazfindia="Sun"  #dia de reunion de fin de semana de gazzano
gazfinini=8 #hora de inicio de reunion de fin de semana de gazzano
gazfinfin=12 #hora de fin de reunion de fin de semana de gazzano

#cambios temporales eg. visita SC
#chusemdia="Thu"
#gazsemdia="Tue"
#estsemdia="Tue"
#gaztmp=09
#gazfinini=${gaztmp#0}

COUNTER=0
while [  $COUNTER = 0 ]; do
hourzero=$(TZ=America/Argentina/Buenos_Aires date +%H)
LANG=C DOW=$(TZ=America/Argentina/Buenos_Aires date +"%a")
hour=${hourzero#0} #quitar el cero inicial

#echo "$DOW"
echo "$hour"


echo "$DOW"


case $DOW in

"$chusemdia")
if [ "$hour" -lt "$chusemfin" -a "$hour" -ge "$chusemini" ]; then
eval $encodeparms$chusemurl
wait
fi
;;

"$chufindia")
if [ "$hour" -lt "$chufinfin" -a "$hour" -ge "$chufinini" ]; then
eval $encodeparms$chufinurl
wait
fi
;;

"$estsemdia")
if [ "$hour" -lt "$estsemfin" -a "$hour" -ge "$estsemini" ]; then
eval $encodeparms$estsemurl
wait
fi
;;

"$estfindia")
if [ "$hour" -lt "$estfinfin" -a "$hour" -ge "$estfinini" ]; then
eval $encodeparms$estfinurl
wait
fi
if [ "$hour" -lt "$gazfinfin" -a "$hour" -ge "$gazfinini" ]; then
echo "hora ok"
eval $encodeparms$gazfinurl
wait
fi
;;

"$gazsemdia")
if [ "$hour" -lt "$gazsemfin" -a "$hour" -ge "$gazsemini" ]; then
eval $encodeparms$gazsemurl
wait
fi
;;

#"$gazfindia")
#echo "dia ok"
#if [ "$hour" -lt "$gazfinfin" -a "$hour" -ge "$gazfinini" ]; then
#echo "hora ok"
#eval $encodeparms$gazfinurl
#wait
#fi
#;;

esac
sleep 15
done
