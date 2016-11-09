FOR /L %%A IN (1,1,200) DO (
  ffmpeg -f dshow -thread_queue_size 4096 -rtbufsize 702000k -i audio="@device_cm_{33D9A762-90C8-11D0-BD43-00A0C911CE86}\wave_{47FE4D29-C048-4BAD-A986-A72E752554FC}" -thread_queue_size 4096 -i "rtsp://192.168.1.114:554/user=admin&password=&channel=1&stream=0.sdp" -ac 1 -filter:a alimiter=limit=.3 -codec:a aac -cutoff 8000 -b:a 32k -vcodec copy -aspect 16:9 -f flv "rtmp://publish.dailymotion.com/publish-dm/x4p2j3m?auth=D7zv_c68cbc2ffe579cec2776ae2a479efc178213f340"

)
