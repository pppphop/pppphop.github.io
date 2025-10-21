`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date:    09:43:44 10/01/2025 
// Design Name: 
// Module Name:    tbroll 
// Project Name: 
// Target Devices: 
// Tool versions: 
// Description: 
//
// Dependencies: 
//
// Revision: 
// Revision 0.01 - File Created
// Additional Comments: 
//
//////////////////////////////////////////////////////////////////////////////////
module tbroll(
    );
reg [31:0] a;
wire [31:0] out;
initial begin
	a=32'h11111111;
	#10;
	a=32'h87654321;
	#10;
end
roll r(a,out);
endmodule
