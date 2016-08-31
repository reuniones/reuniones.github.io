FOR /L %%A IN (1,1,200) DO (
  ffmpeg -f dshow -thread_queue_size 4096 -rtbufsize 702000k -i audio="@device_cm_{33D9A762-90C8-11D0-BD43-00A0C911CE86}\wave_{3830DE51-E911-436C-9A50-EA2426495EE2}" -thread_queue_size 4096 -i "rtsp://192.168.1.114:554/user=admin&password=&channel=1&stream=0.sdp" -ac 1 -filter:a alimiter=limit=.3 -codec:a aac -cutoff 8000 -b:a 32k -vcodec copy -aspect 16:9 -f flv "rtmp://publish.dailymotion.com/publish-dm/x4r6uuy?auth=vFCn_5e8e82041fb5629fccd0c534cbbbe9d2c928a7e4"

)
