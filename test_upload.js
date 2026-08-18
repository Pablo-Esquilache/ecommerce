
const express = require("express");
const app = require("./backend/app.js");
const request = require("supertest");

async function testUpload() {
  const res = await request(app)
    .post("/api/categorias/upload")
    .attach("imagen", Buffer.from("fake image data"), "test.jpg");
    
  console.log("Status:", res.status);
  console.log("Body:", res.body);
}

testUpload();

