#!/bin/bash
# Test sources with captions burned in (N22), made from wide.webm and burned.srt:
#   burned.webm      captions low (83-89% of the height), clear of Loomy's caption line
#   burned-mid.webm  captions on Loomy's caption line (63-69%), so Loomy's must move
cd "$(dirname "$0")"
style="FontName=DejaVu Sans,Bold=1,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0"
ffmpeg -v error -y -i wide.webm -vf "subtitles=burned.srt:force_style='$style,MarginV=30'" -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 1500k -c:a libopus -b:a 96k burned.webm
ffmpeg -v error -y -i wide.webm -vf "subtitles=burned.srt:force_style='$style,MarginV=86'" -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 1500k -c:a libopus -b:a 96k burned-mid.webm
