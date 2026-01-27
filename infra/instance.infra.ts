/// <reference path="../.sst/platform/config.d.ts" />

const tag = "spotInstance";

// Create a VPC for the Spot Instance
const spotInstanceVpc = new aws.ec2.Vpc("spotInstanceVpc", {
    cidrBlock: "172.16.0.0/16",
    tags: {
        Name: tag,
    },
});

// Create an Internet Gateway and attach it to the VPC to allow public access
const spotInstanceIgw = new aws.ec2.InternetGateway("spotInstanceIgw", {
    vpcId: spotInstanceVpc.id,
    tags: {
        Name: tag,
    },
});

// Create a public subnet within the VPC
const spotInstanceSubnet = new aws.ec2.Subnet("spotInstanceSubnet", {
    vpcId: spotInstanceVpc.id,
    cidrBlock: "172.16.10.0/24",
    availabilityZone: "ap-east-1a",
    mapPublicIpOnLaunch: true, // Enable automatic public IP assignment
    tags: {
        Name: tag,
    },
});

// Create a route table for the public subnet
const spotInstanceRouteTable = new aws.ec2.RouteTable("spotInstanceRouteTable", {
    vpcId: spotInstanceVpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: spotInstanceIgw.id,
        },
    ],
    tags: {
        Name: tag,
    },
});

// Associate the route table with the public subnet
const spotInstanceRouteTableAssociation = new aws.ec2.RouteTableAssociation("spotInstanceRouteTableAssociation", {
    subnetId: spotInstanceSubnet.id,
    routeTableId: spotInstanceRouteTable.id,
});

// Create a Security Group for SSH access within the spotInstanceVpc
const securityGroup = new aws.ec2.SecurityGroup("instanceSpotSecurityGroup", {
    vpcId: spotInstanceVpc.id,
    description: `${tag} security group to allow SSH access`,
    ingress: [
        {
            description: "SSH access",
            fromPort: 22,
            toPort: 22,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"], // Consider restricting this in production
        },
    ],
    egress: [
        {
            description: "Allow all outbound traffic",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    tags: {
        Name: tag,
    },
});

// Lookup the latest Ubuntu AMI for x86_64
const ubuntuAmi = aws.ec2.getAmi({
    mostRecent: true,
    owners: ["099720109477"],
    filters: [
        { name: "architecture", values: ["x86_64"] },
        { name: "name", values: ["ubuntu-*"] },
        { name: "root-device-type", values: ["ebs"] },
        { name: "virtualization-type", values: ["hvm"] },
    ],
});

// Create the Spot Instance in the same VPC/subnet/security group
export const instanceSpot = new aws.ec2.Instance("instanceSpot", {
    ami: ubuntuAmi.then(ami => ami.id),
    instanceType: aws.ec2.InstanceType.T3_Small,
    subnetId: spotInstanceSubnet.id,
    vpcSecurityGroupIds: [securityGroup.id],
    associatePublicIpAddress: true, // Ensure instance has a public IPv4
    instanceMarketOptions: {
        marketType: "spot",
        spotOptions: {
            maxPrice: "0.01",
            instanceInterruptionBehavior: "stop",
            spotInstanceType: "persistent",
        },
    },
    tags: {
        Name: tag,
    },
});