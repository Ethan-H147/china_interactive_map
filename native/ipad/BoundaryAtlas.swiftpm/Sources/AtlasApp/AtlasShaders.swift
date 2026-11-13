import Foundation

/// Runtime Metal compilation keeps this app playground self-contained. The two
/// scenes share one library, command queue, device and resource ownership model.
enum AtlasShaders {
    static let source = #"""
    #include <metal_stdlib>
    using namespace metal;
    struct Uniforms {
        float4 right, up, forward;
        float4 camera; // zoom, aspect, selected region, time
        float4 viewport; // pixel width, pixel height, label mode, reduced motion
        float4 flag; // yaw, pitch, aspect ratio, unused
    };
    struct Varying { float4 position [[position]]; float3 color; float front; float2 uv; };
    struct Line { float4 endpoints; float4 owners; };
    float3 sphere(float2 ll) {
        float2 r = ll * (M_PI_F / 180.0f);
        return float3(cos(r.y)*cos(r.x), sin(r.y), cos(r.y)*sin(r.x));
    }
    float4 project(float3 p, constant Uniforms &u, float radius) {
        return float4(dot(p,u.right.xyz)*u.camera.x/u.camera.y*radius,
                      dot(p,u.up.xyz)*u.camera.x*radius,
                      (1.0f-dot(p,u.forward.xyz)*radius)*0.45f+0.05f, 1.0f);
    }
    vertex Varying globeVertex(uint id [[vertex_id]], constant float4 *vertices [[buffer(0)]], constant Uniforms &u [[buffer(1)]]) {
        float4 v=vertices[id]; float3 p=sphere(v.xy);
        float region=v.z;
        float3 color=region<0?float3(0.925,0.945,0.945):region==0?float3(0.86,0.855,0.825):float3(0.925,0.865,0.72);
        if(region>0 && abs(region-u.camera.z)<0.1f)color=float3(0.86,0.62,0.43);
        Varying out;out.position=project(p,u,region>0?1.0008f:region==0?1.0003f:1.0f);
        out.color=color;out.front=dot(p,u.forward.xyz);out.uv=float2(0);return out;
    }
    fragment float4 globeFragment(Varying in [[stage_in]]) {
        if(in.front<0)discard_fragment(); return float4(in.color,1);
    }
    vertex Varying lineVertex(uint id [[vertex_id]], uint instance [[instance_id]], constant Line *lines [[buffer(0)]], constant Uniforms &u [[buffer(1)]]) {
        Line l=lines[instance];float3 a=sphere(l.endpoints.xy),b=sphere(l.endpoints.zw);
        float4 pa=project(a,u,1.0013f),pb=project(b,u,1.0013f);
        float2 pixel=(pb.xy-pa.xy)*u.viewport.xy;
        float2 normal=normalize(float2(-pixel.y,pixel.x)+float2(1e-8));
        bool active=u.camera.z>0 && (abs(l.owners.x-u.camera.z)<0.1f||abs(l.owners.y-u.camera.z)<0.1f);
        float width=active?2.3f:1.15f;
        const float2 corners[6]={float2(0,-1),float2(1,-1),float2(1,1),float2(0,-1),float2(1,1),float2(0,1)};
        float2 corner=corners[id];Varying out;out.position=mix(pa,pb,corner.x);
        out.position.xy+=normal*corner.y*width/u.viewport.xy;
        out.front=mix(dot(a,u.forward.xyz),dot(b,u.forward.xyz),corner.x);
        out.color=active?float3(0.68,0.22,0.12):float3(0.57,0.43,0.26);out.uv=float2(0);return out;
    }
    vertex Varying flagVertex(uint id [[vertex_id]], constant float4 *vertices [[buffer(0)]], constant Uniforms &u [[buffer(1)]]) {
        float2 uv=vertices[id].xy;float t=u.viewport.w>0.5f?0:u.camera.w;
        float z=(sin(uv.x*8-t*2.2+uv.y*2)*0.075+sin(uv.x*16-t*3)*0.024)*uv.x;
        float3 p=float3((uv.x-0.5)*2.3,(0.5-uv.y)*2.3/u.flag.z,z);
        float cy=cos(u.flag.x),sy=sin(u.flag.x),cx=cos(u.flag.y),sx=sin(u.flag.y);
        p=float3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
        p=float3(p.x,cx*p.y-sx*p.z,sx*p.y+cx*p.z);
        float perspective=3.6/(3.6-p.z);Varying out;
        float scale=0.72f*min(u.camera.y,1.0f);
        out.position=float4(p.x/u.camera.y*scale*perspective,p.y*scale*perspective,0.5-p.z*0.1,1);
        float shade=0.88+0.12*cos(uv.x*8-t*2.2+uv.y*2);
        out.color=float3(shade);out.front=1;out.uv=uv;return out;
    }
    fragment float4 flagFragment(Varying in [[stage_in]], texture2d<float> flag [[texture(0)]]) {
        constexpr sampler s(address::clamp_to_edge, filter::linear);
        return float4(flag.sample(s,in.uv).rgb*in.color,1);
    }
    """#
}
