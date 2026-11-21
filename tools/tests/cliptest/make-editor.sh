#!/bin/bash
# Short sources for the editor test (E1-E5): 8 s of wide.webm (16:9, tone) and 6 s of a vertical clip.
cd "$(dirname "$0")"
ffmpeg -v error -y -ss 20 -i wide.webm -t 8 -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 1500k -c:a libopus -b:a 96k ed_a.webm
ffmpeg -v error -y -f lavfi -i "testsrc2=size=540x960:rate=30" -f lavfi -i "sine=frequency=330:sample_rate=48000" -t 6 -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 1200k -c:a libopus -b:a 96k ed_b.webm
