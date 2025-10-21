`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date:    09:31:49 10/01/2025 
// Design Name: 
// Module Name:    roll 
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
module roll(
    input [31:0] a,
    output [31:0] out
    );
reg [3:0] arr[0:7],sum[0:7],tmp;
integer i,j;
always @(*) begin
	for(i=0;i<8;i=i+1) begin
		arr[i]=a[(i + 1) * 4 - 1-:4];
	end
	sum[0]=arr[0];
	for(i=0;i<7;i=i+1) begin
		sum[i+1]=sum[i]+arr[i+1];
	end
end
assign out={sum[7],sum[6],sum[5],sum[4],sum[3],sum[2],sum[1],sum[0]};
endmodule
