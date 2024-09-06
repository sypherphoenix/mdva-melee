import "./gl-matrix-min.js";
const { mat2, mat2d, mat4, mat3, quat, quat2, vec2, vec3, vec4 } = glMatrix;
// glMatrix syntax notes for myself: https://math.hws.edu/graphicsbook/c7/s1.html#webgl3d.1.2

function main() {

  // Get WebGL context
  const canvas = document.getElementById("webgl_canvas");
  if (!canvas) {
    console.error("No matching HTML canvas element, check for typos.");
    return;
  }
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL 2 not supported on this device.");
    return;
  }


  // Shader sources
  const vs_source = `#version 300 es
    precision mediump float;
    
    layout (location = 0) in vec3 a_position;
    layout (location = 1) in vec3 a_normal;
      
    out vec3 position;
    out vec3 normal;

    uniform mat4 u_translation;
    uniform mat4 u_rotation;
    uniform mat4 u_scaling;
    //uniform mat4 u_model; // It is annoying rn to build this CPU-side, so I am calculating it here from TRS.
    uniform mat4 u_view;
    uniform mat4 u_projection;

    uniform float u_time;

    void main() {

      mat4 model = u_translation * u_rotation * u_scaling;

      position = a_position;
      normal = a_normal;
      normal = transpose(inverse(mat3(model))) * a_normal;
      if (length(normal) > 0.0) normal = normalize(normal); // normalize here in vshader for performance
      
      gl_Position = u_projection * u_view * model * vec4(a_position, 1.0);
    }`;
  const fs_source = `#version 300 es
    precision mediump float;

    in vec3 position;
    in vec3 normal;

    out vec4 FragColor;
    
    uniform vec3 u_camera_position;
    uniform vec3 u_light_position;

    uniform float u_time;

    void main() {

      vec4 color = vec4(0.5, 0.5, 0.5, 1.0);
      color.x = abs(sin(u_time/17.0)) * ((position.x / 2.0) + 0.5);
      color.y = abs(sin(u_time/29.0)) * ((position.y / 2.0) + 0.5);
      color.z = abs(sin(u_time/37.0)) * ((position.z / 2.0) + 0.5);


      vec3 light_color = vec3(1.0, 1.0, 1.0);
      vec3 light_direction = normalize(u_light_position - position);

      vec3 ambient = 0.25 * light_color;
      vec3 diffuse = max(dot(normal, light_direction), 0.0) * light_color;
      vec3 specular = 0.5 * pow(max(dot(normalize(u_camera_position - position), reflect(-light_direction, normal)), 0.0), 32.0) * light_color;

      vec4 phong = vec4(ambient + diffuse + specular, 1.0) * color;
      FragColor = phong;
    }`;

    const program = MakeShaderProgram(gl, vs_source, fs_source);
    gl.useProgram(program);


    // position x, y, z & normal x, y, z
    const cube_verts = new Float32Array([
       0.5,  0.5, -0.5,    0.0,  0.0, -1.0, // back face 0
       0.5, -0.5, -0.5,    0.0,  0.0, -1.0,
      -0.5, -0.5, -0.5,    0.0,  0.0, -1.0,
      -0.5,  0.5, -0.5,    0.0,  0.0, -1.0,

       0.5,  0.5,  0.5,    0.0,  0.0,  1.0, // front face 4
       0.5, -0.5,  0.5,    0.0,  0.0,  1.0,
      -0.5, -0.5,  0.5,    0.0,  0.0,  1.0,
      -0.5,  0.5,  0.5,    0.0,  0.0,  1.0,

       0.5, -0.5,  0.5,    0.0, -1.0,  0.0, // bot face 8
       0.5, -0.5, -0.5,    0.0, -1.0,  0.0,
      -0.5, -0.5, -0.5,    0.0, -1.0,  0.0,
      -0.5, -0.5,  0.5,    0.0, -1.0,  0.0,

       0.5,  0.5,  0.5,    0.0,  1.0,  0.0, // top face 12
       0.5,  0.5, -0.5,    0.0,  1.0,  0.0,
      -0.5,  0.5, -0.5,    0.0,  1.0,  0.0,
      -0.5,  0.5,  0.5,    0.0,  1.0,  0.0,

      -0.5,  0.5,  0.5,   -1.0,  0.0,  0.0, // left face 16
      -0.5,  0.5, -0.5,   -1.0,  0.0,  0.0,
      -0.5, -0.5, -0.5,   -1.0,  0.0,  0.0,
      -0.5, -0.5,  0.5,   -1.0,  0.0,  0.0,

       0.5,  0.5,  0.5,    1.0,  0.0,  0.0, // right face 20
       0.5,  0.5, -0.5,    1.0,  0.0,  0.0,
       0.5, -0.5, -0.5,    1.0,  0.0,  0.0,
       0.5, -0.5,  0.5,    1.0,  0.0,  0.0,
    ]);

    const cube_indices = [
      0, 1, 2,  // back
      0, 2, 3,

      4, 5, 6,  // front
      4, 6, 7,

      8, 9, 10, // bot
      8, 10, 11,

      12, 13, 14, // top
      12, 14, 15,

      16, 17, 18, // left
      16, 18, 19,

      20, 21, 22, // right
      20, 22, 23,
    ];


    const float32_size = 4; // no sizeof in javascript...?

    // GPU buffer for verts data
    const verts_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verts_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube_verts, gl.STATIC_DRAW);

    // Attribute for verts position data
    const a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, float32_size*6, 0);

    // Attribute for verts normal data
    const a_normal = gl.getAttribLocation(program, "a_normal");
    gl.enableVertexAttribArray(a_normal);
    gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, float32_size*6, float32_size*3);
    
    // GPU buffer for indexed drawing
    const verts_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verts_index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube_indices), gl.STATIC_DRAW);



    // Uniform locations
    const u_translation = gl.getUniformLocation(program, "u_translation");
    const u_rotation = gl.getUniformLocation(program, "u_rotation");
    const u_scaling = gl.getUniformLocation(program, "u_scaling");
    const u_view = gl.getUniformLocation(program, "u_view");
    const u_projection = gl.getUniformLocation(program, "u_projection");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_camera_position = gl.getUniformLocation(program, "u_camera_position");
    const u_light_position = gl.getUniformLocation(program, "u_light_position");
    
    

    // MVP transforms (buildling model from TRS)
    const translation = mat4.create();
    const rotation = mat4.create();
    const scaling = mat4.create();
    const view = mat4.create();
    const projection = mat4.create();
    mat4.perspective(projection, 0.785398 /* 45° */, (canvas.clientWidth / canvas.clientHeight), 0.1, 100.0);

    
    
    



    // Camera
    const camera_pos = vec3.clone([0.0, 0.0, 3.0]);
    const camera_target = vec3.clone([0.0, 0.0, 0.0]);
    const camera_up = vec3.clone([0.0, 1.0, 0.0]);

    // Lighting
    const light_pos = vec3.clone([4.0, 3.0, 15.0]);

    // Rendering settings
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);



    /* * * * * * * * *
    * RENDER LOOP
    * * * * * * * * */
    function render() {

      // Resize check
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight){
          canvas.width  = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          
          mat4.perspective(projection, 0.785398 /* 45° */, (canvas.clientWidth / canvas.clientHeight), 0.1, 100.0);
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }
      
      const time = new Float32Array([(new Date().getTime() % 31415926) / 1000.00])[0]; // IDK why I have to do this mod here, but it doesn't work without it (maybe overflow? some typing shenanigans?)
      
      // Update model components
      mat4.rotate(rotation, rotation, 0.0125, [1.0, 1.0, -0.2]); // Angle & axis

      // Update camera & view
      mat4.lookAt(view, camera_pos, camera_target, camera_up);


      // Push uniforms
      gl.uniform1f(u_time, time);
      gl.uniformMatrix4fv(u_translation, false, translation);
      gl.uniformMatrix4fv(u_rotation, false, rotation);
      gl.uniformMatrix4fv(u_scaling, false, scaling);
      gl.uniformMatrix4fv(u_view, false, view);
      gl.uniformMatrix4fv(u_projection, false, projection);
      gl.uniform3fv(u_camera_position, camera_pos);
      gl.uniform3fv(u_light_position, light_pos);

      // Indexed drawing
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verts_index_buffer);
      gl.drawElements(gl.TRIANGLES, cube_indices.length, gl.UNSIGNED_SHORT, 0);
      
      
      requestAnimationFrame(render); // Enqueue another render 
    }

  requestAnimationFrame(render); // Begin render loop
}



function MakeShaderProgram(gl, vs_source, fs_source) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vs_source);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const errorMessage = gl.getShaderInfoLog(vs);
    console.error(`Failed to compile vertex shader: ${errorMessage}`);
    return;
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fs_source);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const errorMessage = gl.getShaderInfoLog(fs);
    console.error(`Failed to compile fragment shader: ${errorMessage}`);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const errorMessage = gl.getProgramInfoLog(program);
    console.error(`Failed to link GPU program: ${errorMessage}`);
    return;
  }

  return program;
}


  
try {
  main();
} catch (e) {
  console.error(`Uncaught JavaScript exception: ${e}`);
}